export const startInterview = (req, res) => {
  res.json({ message: 'Start interview controller' });
};

export const submitAnswer = (req, res) => {
  res.json({ message: 'Submit answer controller' });
};

export const getSession = (req, res) => {
  res.json({ message: `Get interview session controller for ${req.params.sessionId}` });
}; 