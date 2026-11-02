const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dev_summit_2026";
  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 3000,
  });
  console.log(
    `[Dev Summit] MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`,
  );
  return conn;
};

module.exports = connectDB;
