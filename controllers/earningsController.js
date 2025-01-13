import Borrow from "../models/borrowModel.js";
import Book from "../models/bookModel.js";
import Category from "../models/categoryModel.js";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
  format,
} from "date-fns";

// Helper function to get date range based on the time frame
const getDateRange = (timeFrame) => {
  const now = new Date();
  switch (timeFrame) {
    case "month":
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case "year":
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    default:
      return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
  }
};

// Helper function to calculate earnings for borrows
const calculateTotalEarnings = (borrows) =>
  borrows.reduce((total, borrow) => total + borrow.total_borrow_price, 0);

// Get previous earnings (same time period, previous instance)
const getPreviousEarnings = async (startDate, endDate) => {
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(
    previousStartDate.getDate() -
      Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  );

  const previousBorrows = await Borrow.find({
    borrowed_date: { $gte: previousStartDate, $lt: startDate },
  });
  return calculateTotalEarnings(previousBorrows);
};

// Helper function to categorize earnings by category and book
const categorizeEarnings = async (borrows) => {
  const earningsByCategory = {};
  const bookEarnings = {};

  const categories = await Category.find({});
  const categoryMap = categories.reduce((acc, category) => {
    acc[category._id.toString()] = category.name;
    return acc;
  }, {});

  borrows.forEach(({ borrowed_book, total_borrow_price }) => {
    const categoryId = borrowed_book.category.toString();
    const categoryName = categoryMap[categoryId] || "Unknown Category";

    earningsByCategory[categoryName] =
      (earningsByCategory[categoryName] || 0) + total_borrow_price;
    bookEarnings[borrowed_book._id.toString()] =
      (bookEarnings[borrowed_book._id.toString()] || 0) + total_borrow_price;
  });

  return { earningsByCategory, bookEarnings };
};

// Get top-selling books based on earnings
const getTopSellingBooks = async (bookEarnings) => {
  const bookIds = Object.keys(bookEarnings);
  const books = await Book.find({ _id: { $in: bookIds } });

  // Fetch borrow records to count copies borrowed
  const borrowRecords = await Borrow.find({ borrowed_book: { $in: bookIds } });

  // Count copies borrowed for each book
  const copiesBorrowedCount = borrowRecords.reduce((acc, record) => {
    acc[record.borrowed_book] = (acc[record.borrowed_book] || 0) + 1;
    return acc;
  }, {});

  return books
    .map((book) => ({
      id: book._id,
      title: book.title,
      author: book.author,
      copies_borrowed: copiesBorrowedCount[book._id] || 0,
      earnings: bookEarnings[book._id.toString()],
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);
};

// Calculate daily earnings for the given borrows
const calculateDailyEarnings = (borrows, startDate, endDate) => {
  const getAllDatesInRange = (start, end) => {
    const dates = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const allDates = getAllDatesInRange(startDate, endDate);

  return allDates.reduce((acc, date) => {
    const borrowsOnDate = borrows.filter(
      (borrow) => borrow.borrowed_date.toISOString().split("T")[0] === date
    );
    acc[date] = borrowsOnDate.reduce(
      (total, { total_borrow_price }) => total + total_borrow_price,
      0
    );
    return acc;
  }, {});
};

// Calculate monthly earnings for the given borrows
const calculateMonthlyEarnings = (borrows) => {
  return borrows.reduce((acc, borrow) => {
    const month = format(new Date(borrow.borrowed_date), "MMMM");
    acc[month] = (acc[month] || 0) + borrow.total_borrow_price;
    return acc;
  }, {});
};

// Get earnings based on time frame (week, month, year)
export const getEarnings = async (req, res) => {
  try {
    const { timeFrame = "week" } = req.query;

    // Validate time frame
    if (!["week", "month", "year"].includes(timeFrame)) {
      return res.status(400).json({
        error: "Invalid time frame. Use 'week', 'month', or 'year'.",
      });
    }

    // Get the date range based on the time frame
    const { startDate, endDate } = getDateRange(timeFrame);

    // Fetch borrows within the time frame
    const borrows = await Borrow.find({
      borrowed_date: { $gte: startDate, $lte: endDate },
    }).populate("borrowed_book");

    // Calculate total earnings for the current period
    const totalEarnings = calculateTotalEarnings(borrows);

    // Fetch previous earnings (for comparison)
    const previousEarnings = await getPreviousEarnings(startDate, endDate);

    // Categorize earnings by category and book
    const { earningsByCategory, bookEarnings } = await categorizeEarnings(
      borrows
    );

    // Get top-selling books based on earnings
    const topSellingBooks = await getTopSellingBooks(bookEarnings);

    // Calculate daily or monthly earnings based on time frame
    const earningsData =
      timeFrame === "year"
        ? calculateMonthlyEarnings(borrows)
        : calculateDailyEarnings(borrows, startDate, endDate);

    // Return the response with earnings data
    res.json({
      totalEarnings,
      previousEarnings,
      earningsByCategory,
      topSellingBooks,
      [timeFrame === "year" ? "monthlyEarnings" : "dailyEarnings"]:
        earningsData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error:
        "An unexpected error occurred while retrieving earnings. Please try again later.",
    });
  }
};
