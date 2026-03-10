const { AppError } = require("../utils/AppError");

function notFoundMiddleware(req, _res, next) {
  return next(new AppError(`Rota não encontrada: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

module.exports = {
  notFoundMiddleware,
};

