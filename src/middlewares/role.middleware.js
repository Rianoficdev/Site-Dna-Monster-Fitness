const { AppError } = require("../utils/AppError");

function roleMiddleware(...allowedRoles) {
  return function guardByRole(req, _res, next) {
    if (!req.user) {
      return next(new AppError("Usuário não autenticado.", 401, "UNAUTHENTICATED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Acesso negado para este perfil.", 403, "FORBIDDEN"));
    }

    return next();
  };
}

module.exports = {
  roleMiddleware,
};

