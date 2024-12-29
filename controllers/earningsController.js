import Borrow from "../models/borrowModel.js";

// Get earnings for a specific user
export const getEarnings = async (req, res) => {
  try {
    const { userId } = req.params;
    const borrows = await Borrow.find({ borrowed_by: userId });

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
