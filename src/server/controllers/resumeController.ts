export const uploadResume = (req, res) => {
  res.json({ message: 'Upload resume controller' });
};

export const getResume = (req, res) => {
  res.json({ message: `Get resume controller for ${req.params.id}` });
};

export const deleteResume = (req, res) => {
  res.json({ message: `Delete resume controller for ${req.params.id}` });
}; 