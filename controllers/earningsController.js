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

export const getEarnings = async (req, res) => {
  try {
    const { timeFrame = "week" } = req.query;

    if (!["week", "month", "year"].includes(timeFrame)) {
      return res
        .status(400)
        .json({ error: "Invalid time frame. Use 'week', 'month', or 'year'." });
    }

    const { startDate, endDate } = getDateRange(timeFrame);
    const borrows = await Borrow.find({
      borrowed_date: { $gte: startDate, $lte: endDate },
    }).populate("borrowed_book");

    const totalEarnings = calculateTotalEarnings(borrows);
    const previousEarnings = await getPreviousEarnings(startDate, endDate);
    const { earningsByCategory, bookEarnings } = await categorizeEarnings(
      borrows
    );
    const topSellingBooks = await getTopSellingBooks(bookEarnings);

    const earningsData =
      timeFrame === "year"
        ? calculateMonthlyEarnings(borrows)
        : calculateDailyEarnings(borrows, startDate, endDate);

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

const calculateTotalEarnings = (borrows) =>
  borrows.reduce((total, borrow) => total + borrow.total_borrow_price, 0);

const getPreviousEarnings = async (startDate, endDate) => {
  const daysInPeriod =
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(previousStartDate.getDate() - daysInPeriod);

  const previousBorrows = await Borrow.find({
    borrowed_date: { $gte: previousStartDate, $lt: startDate },
  });

  return calculateTotalEarnings(previousBorrows);
};

const categorizeEarnings = async (borrows) => {
  const earningsByCategory = {};
  const bookEarnings = {};
  const categories = await Category.find({});
  const categoryMap = categories.reduce((acc, category) => {
    acc[category._id.toString()] = category.name;
    return acc;
  }, {});

  for (const { borrowed_book, total_borrow_price } of borrows) {
    const categoryId = borrowed_book.category.toString();
    const bookId = borrowed_book._id.toString();
    const categoryName = categoryMap[categoryId] || "Unknown Category";

    earningsByCategory[categoryName] =
      (earningsByCategory[categoryName] || 0) + total_borrow_price;
    bookEarnings[bookId] = (bookEarnings[bookId] || 0) + total_borrow_price;
  }

  return { earningsByCategory, bookEarnings };
};

const getTopSellingBooks = async (bookEarnings) => {
  const bookIds = Object.keys(bookEarnings);
  const books = await Book.find({ _id: { $in: bookIds } });

  return books
    .map((book) => ({
      id: book._id,
      title: book.title,
      author: book.author,
      earnings: bookEarnings[book._id.toString()],
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);
};

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

const calculateMonthlyEarnings = (borrows) => {
  const monthlyEarnings = borrows.reduce((acc, borrow) => {
    const month = format(new Date(borrow.borrowed_date), "MMMM");
    acc[month] = (acc[month] || 0) + borrow.total_borrow_price;
    return acc;
  }, {});

  return monthlyEarnings;
};
