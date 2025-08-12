export const parseResume = async (file: any) => {
  // Dummy: Simulate calling Python microservice
  return { name: 'John Doe', skills: ['Python', 'NLP'] };
};

export const generateInterviewQuestions = async (resume: any, jobTitle: string) => {
  // Dummy: Simulate calling Python microservice
  return [
    'Tell me about yourself.',
    'What are your strengths?',
  ];
};

export const getAnswerFeedback = async (question: string, answer: string) => {
  // Dummy: Simulate calling Python microservice
  return { feedback: 'Good answer.', score: 8 };
}; 