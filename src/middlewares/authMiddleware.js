export const requireAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'admin') {
    return next();
  }
  return res.status(403).send("Bạn không có quyền truy cập.");
};