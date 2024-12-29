import Borrow from "../models/borrowModel.js";

export const getEarnings = async (req, res) => {
  try {
    // Fetch all borrow records from the database
    const borrows = await Borrow.find();

    // Calculate total earnings
    const totalEarnings = borrows.reduce(
      (acc, borrow) => acc + borrow.total_borrow_price,
      0
    );

    res.json({ totalEarnings });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error:
        "An unexpected error occurred while retrieving earnings. Please try again later.",
    });
  }
};
