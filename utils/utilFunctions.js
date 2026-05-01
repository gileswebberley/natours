import crypto from 'crypto';
//used for reset password tokens
export const cryptoHash = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
//used for updating non-sensitive user data
export const filterObj = (obj, ...filters) => {
  const filteredObj = {};
  Object.keys(obj).forEach((el) => {
    if (filters.includes(el)) filteredObj[el] = obj[el];
  });
  return filteredObj;
};
