import { generateStructuredContent } from '../genkit';
import { ParsedResume } from '../../utils/resumeParser';

export interface InterviewQuestion {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'problem-solving' | 'experience' | 'general';
  difficulty: 'easy' | 'medium' | 'hard';
  expectedAnswer?: string;
  tips?: string[];
}

export interface QuestionGenerationRequest {
  jobTitle: string;
  resume?: ParsedResume;
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
  categories?: string[];
  focusAreas?: string[];
}

export interface QuestionGenerationResponse {
  success: boolean;
  questions: InterviewQuestion[];
  jobTitle: string;
  difficulty: string;
  count: number;
  error?: string;
}

/**
 * Interview Question Generator using genai
 * Generates custom interview questions based on job title and resume
 */
export class InterviewQuestionGenerator {
  
  /**
   * Generate interview questions
   */
  static async generateQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResponse> {
    try {
      const resumeContext = request.resume ? `
        Resume Context:
        - Skills: ${request.resume.skills.join(', ')}
        - Experience: ${request.resume.experience.length} positions
        - Education: ${request.resume.education.length} degrees
        - Years of Experience: ${this.calculateYearsOfExperience(request.resume)}
      ` : '';

      const categories = request.categories?.join(', ') || 'technical, behavioral, problem-solving, experience';
      const focusAreas = request.focusAreas?.join(', ') || '';

      const prompt = `
        Generate ${request.numQuestions} interview questions for a ${request.jobTitle} position.
        Difficulty level: ${request.difficulty}
        Categories to include: ${categories}
        ${focusAreas ? `Focus areas: ${focusAreas}` : ''}
        
        ${resumeContext}
        
        Generate questions that are:
        - Relevant to the ${request.jobTitle} role
        - Appropriate for ${request.difficulty} difficulty level
        - Diverse across different categories
        - Practical and realistic
        
        Return a JSON array with this structure:
        [
          {
            "id": "unique_question_id",
            "question": "the interview question",
            "category": "technical|behavioral|problem-solving|experience|general",
            "difficulty": "easy|medium|hard",
            "expectedAnswer": "brief description of what a good answer should include",
            "tips": ["tip1", "tip2"]
          }
        ]
        
        Ensure questions are:
        - Specific to the role
        - Challenging but fair for the difficulty level
        - Mix of technical and soft skills
        - Based on real-world scenarios
      `;

      const fallbackQuestions: InterviewQuestion[] = [
        {
          id: 'fallback-1',
          question: 'Tell me about yourself and your background.',
          category: 'general',
          difficulty: 'easy',
          expectedAnswer: 'A concise summary of your professional background and key achievements.',
          tips: ['Keep it under 2 minutes', 'Focus on relevant experience']
        }
      ];

      const questions = await generateStructuredContent<InterviewQuestion[]>(prompt, fallbackQuestions);

      return {
        success: true,
        questions: questions || fallbackQuestions,
        jobTitle: request.jobTitle,
        difficulty: request.difficulty,
        count: questions?.length || fallbackQuestions.length
      };

    } catch (error) {
      console.error('Error in InterviewQuestionGenerator:', error);
      return {
        success: false,
        questions: [],
        jobTitle: request.jobTitle,
        difficulty: request.difficulty,
        count: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate technical questions
   */
  static async generateTechnicalQuestions(jobTitle: string, difficulty: 'easy' | 'medium' | 'hard', count: number = 3): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
        Generate ${count} technical interview questions for a ${jobTitle} position.
        Difficulty level: ${difficulty}
        
        Focus on:
        - Programming concepts and languages relevant to ${jobTitle}
        - System design and architecture
        - Data structures and algorithms
        - Database and data management
        - Tools and technologies used in ${jobTitle} role
        
        Return a JSON array of technical questions with the structure:
        [
          {
            "id": "tech_question_id",
            "question": "technical question",
            "category": "technical",
            "difficulty": "${difficulty}",
            "expectedAnswer": "brief description of expected technical answer",
            "tips": ["technical tip1", "technical tip2"]
          }
        ]
      `;

      const fallbackQuestions: InterviewQuestion[] = [
        {
          id: 'tech-fallback-1',
          question: 'Explain the difference between REST and GraphQL APIs.',
          category: 'technical',
          difficulty,
          expectedAnswer: 'Comparison of REST vs GraphQL including pros and cons of each approach.',
          tips: ['Discuss use cases', 'Mention performance implications']
        }
      ];

      const questions = await generateStructuredContent<InterviewQuestion[]>(prompt, fallbackQuestions);
      return questions || fallbackQuestions;

    } catch (error) {
      console.error('Error generating technical questions:', error);
      return [];
    }
  }

  /**
   * Generate behavioral questions
   */
  static async generateBehavioralQuestions(jobTitle: string, difficulty: 'easy' | 'medium' | 'hard', count: number = 3): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
        Generate ${count} behavioral interview questions for a ${jobTitle} position.
        Difficulty level: ${difficulty}
        
        Focus on:
        - Leadership and teamwork scenarios
        - Problem-solving and conflict resolution
        - Communication and collaboration
        - Adaptability and learning
        - Project management and delivery
        
        Return a JSON array of behavioral questions with the structure:
        [
          {
            "id": "behavioral_question_id",
            "question": "behavioral question",
            "category": "behavioral",
            "difficulty": "${difficulty}",
            "expectedAnswer": "brief description of expected behavioral answer",
            "tips": ["behavioral tip1", "behavioral tip2"]
          }
        ]
      `;

      const fallbackQuestions: InterviewQuestion[] = [
        {
          id: 'behavioral-fallback-1',
          question: 'Describe a challenging project you worked on and how you overcame obstacles.',
          category: 'behavioral',
          difficulty,
          expectedAnswer: 'STAR method response with specific situation, task, action, and result.',
          tips: ['Use STAR method', 'Be specific with examples']
        }
      ];

      const questions = await generateStructuredContent<InterviewQuestion[]>(prompt, fallbackQuestions);
      return questions || fallbackQuestions;

    } catch (error) {
      console.error('Error generating behavioral questions:', error);
      return [];
    }
  }

  /**
   * Generate problem-solving questions
   */
  static async generateProblemSolvingQuestions(jobTitle: string, difficulty: 'easy' | 'medium' | 'hard', count: number = 2): Promise<InterviewQuestion[]> {
    try {
      const prompt = `
        Generate ${count} problem-solving interview questions for a ${jobTitle} position.
        Difficulty level: ${difficulty}
        
        Focus on:
        - Real-world technical problems
        - System design challenges
        - Optimization scenarios
        - Debugging and troubleshooting
        - Scalability and performance issues
        
        Return a JSON array of problem-solving questions with the structure:
        [
          {
            "id": "problem_solving_question_id",
            "question": "problem-solving scenario",
            "category": "problem-solving",
            "difficulty": "${difficulty}",
            "expectedAnswer": "brief description of expected problem-solving approach",
            "tips": ["problem-solving tip1", "problem-solving tip2"]
          }
        ]
      `;

      const fallbackQuestions: InterviewQuestion[] = [
        {
          id: 'problem-solving-fallback-1',
          question: 'How would you design a URL shortening service like bit.ly?',
          category: 'problem-solving',
          difficulty,
          expectedAnswer: 'System design approach covering requirements, architecture, and trade-offs.',
          tips: ['Start with requirements', 'Consider scalability']
        }
      ];

      const questions = await generateStructuredContent<InterviewQuestion[]>(prompt, fallbackQuestions);
      return questions || fallbackQuestions;

    } catch (error) {
      console.error('Error generating problem-solving questions:', error);
      return [];
    }
  }

  /**
   * Calculate years of experience from resume
   */
  private static calculateYearsOfExperience(resume: ParsedResume): number {
    if (!resume.experience || resume.experience.length === 0) {
      return 0;
    }

    // Simple calculation - could be enhanced with actual date parsing
    return resume.experience.length * 2; // Rough estimate: 2 years per position
  }

  /**
   * Get question by category
   */
  static getQuestionsByCategory(questions: InterviewQuestion[], category: string): InterviewQuestion[] {
    return questions.filter(q => q.category === category);
  }

  /**
   * Get questions by difficulty
   */
  static getQuestionsByDifficulty(questions: InterviewQuestion[], difficulty: string): InterviewQuestion[] {
    return questions.filter(q => q.difficulty === difficulty);
  }
} 