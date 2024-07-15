const Winston = require("winston");


/* SETUP LEVELS OF LOGGING ------------------------------------- */
const level = () => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  return isDevelopment ? "info" : "warn";
};

/* CREATE LOGGER ENTITY TO BE USED ELSE WHERE IN THE APP -------- */
const logger = Winston.createLogger({
  level: level(),
  format: Winston.format.combine(
    Winston.format.timestamp(),
    Winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`;
    })
  ),
  transports: [
    new Winston.transports.Console(),
    new Winston.transports.File({
      filename: "logs/server.log",
    }),
  ],
});

module.exports = logger;