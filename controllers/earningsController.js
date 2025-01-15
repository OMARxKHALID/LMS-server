import Borrow from "../models/borrowModel.js";
import Book from "../models/bookModel.js";
import Category from "../models/categoryModel.js";
import Transaction from "../models/transactionModel.js";
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  endOfWeek,
  endOfMonth,
  endOfYear,
} from "date-fns";

// Helper function to get the date range based on the selected time frame
const getDateRange = (timeFrame) => {
  const now = new Date();
  const dateRanges = {
    week: { startDate: startOfWeek(now), endDate: endOfWeek(now) },
    month: { startDate: startOfMonth(now), endDate: endOfMonth(now) },
    year: { startDate: startOfYear(now), endDate: endOfYear(now) },
  };
  return dateRanges[timeFrame];
};

// Helper function to calculate total earnings based on records and price field
const calculateTotalEarnings = (records, priceField) =>
  records.reduce((total, record) => total + record[priceField], 0);

// Get previous earnings based on the start and end date
const getPreviousEarnings = async (startDate, endDate) => {
  const previousStartDate = new Date(startDate);
  previousStartDate.setDate(
    previousStartDate.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24)
  );

  const previousBorrows = await Borrow.find({
    borrowed_date: { $gte: previousStartDate, $lt: startDate },
  });
  return calculateTotalEarnings(previousBorrows, "total_borrow_price");
};

// Categorize earnings by category and book
const categorizeEarnings = async (borrows) => {
  const categories = await Category.find({});
  const categoryMap = categories.reduce((acc, category) => {
    acc[category._id.toString()] = category.name;
    return acc;
  }, {});

  const earningsByCategory = {};
  const bookEarnings = {};

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

// Get top-selling books based on earnings and borrow/purchase counts
const getTopSellingBooks = async (bookEarnings) => {
  const bookIds = Object.keys(bookEarnings);
  const books = await Book.find({ _id: { $in: bookIds } });

  const borrowRecords = await Borrow.find({ borrowed_book: { $in: bookIds } });
  const transactionRecords = await Transaction.find({ book: { $in: bookIds } });

  const counts = {
    borrowed: borrowRecords.reduce((acc, record) => {
      acc[record.borrowed_book] = (acc[record.borrowed_book] || 0) + 1;
      return acc;
    }, {}),
    purchased: transactionRecords.reduce((acc, record) => {
      acc[record.book] = (acc[record.book] || 0) + 1;
      return acc;
    }, {}),
  };

  return books
    .map((book) => ({
      id: book._id,
      title: book.title,
      author: book.author,
      copies_purchased: counts.purchased[book._id] || 0,
      copies_borrowed: counts.borrowed[book._id] || 0,
      earnings: bookEarnings[book._id.toString()],
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 5);
};

// Get earnings data by time frame (week, month, year)
const getEarningsByTimeFrame = (borrows, transactions, startDate, endDate) => {
  const dateRange = (start, end) => {
    const dates = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
  };

  const allDates = dateRange(startDate, endDate);

  const earningsMap = borrows.reduce((acc, borrow) => {
    const date = borrow.borrowed_date.toISOString().split("T")[0];
    if (allDates.includes(date)) {
      acc[date] = (acc[date] || 0) + borrow.total_borrow_price;
    }
    return acc;
  }, {});

  const transactionsMap = transactions.reduce((acc, transaction) => {
    const date = transaction.createdAt.toISOString().split("T")[0];
    if (allDates.includes(date)) {
      acc[date] = (acc[date] || 0) + transaction.total_price;
    }
    return acc;
  }, {});

  // Fill missing data for dates with no earnings
  return allDates.map((date) => ({
    date,
    purchased: transactionsMap[date] || 0,
    borrowed: earningsMap[date] || 0,
  }));
};

// Main function to get earnings data based on the time frame (week, month, year)
export const getEarnings = async (req, res) => {
  try {
    const { timeFrame } = req.query;

    if (!["week", "month", "year"].includes(timeFrame)) {
      return res
        .status(400)
        .json({ error: "Invalid time frame. Use 'week', 'month', or 'year'." });
    }

    const { startDate, endDate } = getDateRange(timeFrame);

    const borrows = await Borrow.find({
      borrowed_date: { $gte: startDate, $lte: endDate },
    }).populate("borrowed_book");
    const transactions = await Transaction.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("book");

    const totalBorrowEarnings = calculateTotalEarnings(
      borrows,
      "total_borrow_price"
    );
    const totalPurchaseEarnings = calculateTotalEarnings(
      transactions,
      "total_price"
    );

    const previousEarnings = await getPreviousEarnings(startDate, endDate);

    const { earningsByCategory, bookEarnings } = await categorizeEarnings(
      borrows
    );

    const topSellingBooks = await getTopSellingBooks(bookEarnings);

    const earningsData = getEarningsByTimeFrame(
      borrows,
      transactions,
      startDate,
      endDate
    );

    res.json({
      totalBorrowEarnings,
      totalPurchaseEarnings,
      previousEarnings,
      earningsByCategory,
      topSellingBooks,
      earningsData,
      totalBooksBorrowed: borrows.length,
      totalBooksPurchased: transactions.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error:
        "An unexpected error occurred while retrieving earnings. Please try again later.",
    });
  }
};
