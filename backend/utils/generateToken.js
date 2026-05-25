import jwt from 'jsonwebtoken';

const generateToken = (id, rememberMe = false) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: rememberMe ? '30d' : '1d',
  });
};

export default generateToken;
