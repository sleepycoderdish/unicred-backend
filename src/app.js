const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const routes = require("./routes/index");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(
  cors({
    origin:true , // your frontend's URL
    credentials: true, // REQUIRED so the browser sends/receives cookies
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

// Mount all API routes under /api
app.use("/api", routes);

// Global error handler — must be LAST
app.use(errorMiddleware);

module.exports = app;