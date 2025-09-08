// export const register = (req, res) => {
//   res.json({ message: 'Register controller' });
// };

// export const login = (req, res) => {
//   res.json({ message: 'Login controller' });
// };

// export const getMe = (req, res) => {
//   res.json({ message: 'GetMe controller' });
// }; 

import { Request, Response } from 'express';

export const register = (req: Request, res: Response) => {
  res.json({ message: 'Register controller' });
};

export const login = (req: Request, res: Response) => {
  res.json({ message: 'Login controller' });
};

export const getMe = (req: Request, res: Response) => {
  res.json({ message: 'GetMe controller' });
};