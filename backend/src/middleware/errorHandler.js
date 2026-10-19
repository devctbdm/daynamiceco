export const notFound = (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
};

export const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err.stack);

  if (err.name === 'ValidationError') {
    return res
      .status(400)
      .json({ success: false, message: 'Validation error', errors: err.errors });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({ success: false, message: `Duplicate value for field: ${field}` });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};
