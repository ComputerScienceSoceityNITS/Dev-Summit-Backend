const mongoose = require("mongoose");
const { isVercel } = require("../utils/runtimeEnvironment");

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri && isVercel) {
    throw new Error("MONGO_URI must be configured for the deployed API.");
  }

  connectionPromise = mongoose
    .connect(
      mongoUri || "mongodb://127.0.0.1:27017/dev_summit_2026",
      { serverSelectionTimeoutMS: 3000 },
    )
    .then((conn) => {
      console.log(
        `[Dev Summit] MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`,
      );
      connectionPromise = undefined;
      return conn;
    })
    .catch((error) => {
      connectionPromise = undefined;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
