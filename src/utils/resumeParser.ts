/**
 * Local Resume Parser Utility
 * Provides fallback functionality when Python microservice is unavailable
 */

export interface ParsedResume {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
}

export interface ResumeParseResult {
  success: boolean;
  data?: ParsedResume;
  error?: string;
  confidence: number; // 0-1 score indicating parsing confidence
}

/**
 * Extract text content from various file formats
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    // For now, only handle text-based files
    if (file.type === 'text/plain' || file.type === 'application/pdf') {
      reader.readAsText(file);
    } else {
      reject(new Error('Unsupported file type. Please upload a PDF or text file.'));
    }
  });
};

/**
 * Basic resume parsing using regex patterns
 */
export const parseResumeText = (text: string): ResumeParseResult => {
  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const parsed: ParsedResume = {
      personalInfo: {
        name: '',
        email: '',
        phone: '',
        location: ''
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: []
    };

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      parsed.personalInfo.email = emailMatch[0];
    }

    // Extract phone number
    const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      parsed.personalInfo.phone = phoneMatch[0];
    }

    // Extract skills (basic keyword matching)
    const skillKeywords = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'C#',
      'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Azure', 'Docker', 'Kubernetes',
      'Git', 'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Babel', 'Jest',
      'Agile', 'Scrum', 'DevOps', 'CI/CD', 'REST API', 'GraphQL', 'Microservices'
    ];

    const foundSkills = skillKeywords.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    parsed.skills = foundSkills;

    // Basic name extraction (first line that doesn't contain email/phone)
    for (const line of lines) {
      if (!emailRegex.test(line) && !phoneRegex.test(line) && line.length > 2) {
        parsed.personalInfo.name = line;
        break;
      }
    }

    // Extract experience (basic pattern matching)
    const experiencePatterns = [
      /(.*?)\s*[-–]\s*(.*?)\s*[-–]\s*(.*?)/, // Title - Company - Duration
      /(.*?)\s+at\s+(.*?)\s+[-–]\s+(.*?)/,   // Title at Company - Duration
    ];

    for (const line of lines) {
      for (const pattern of experiencePatterns) {
        const match = line.match(pattern);
        if (match && match[1].length > 3 && match[2].length > 2) {
          parsed.experience.push({
            title: match[1].trim(),
            company: match[2].trim(),
            duration: match[3]?.trim() || '',
            description: []
          });
          break;
        }
      }
    }

    // Calculate confidence score
    const confidence = calculateConfidence(parsed);

    return {
      success: true,
      data: parsed,
      confidence
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      confidence: 0
    };
  }
};

/**
 * Calculate parsing confidence based on extracted data quality
 */
const calculateConfidence = (parsed: ParsedResume): number => {
  let score = 0;
  let totalChecks = 0;

  // Check personal info
  if (parsed.personalInfo.name) { score += 1; }
  if (parsed.personalInfo.email) { score += 1; }
  if (parsed.personalInfo.phone) { score += 1; }
  totalChecks += 3;

  // Check experience
  if (parsed.experience.length > 0) { score += 1; }
  totalChecks += 1;

  // Check skills
  if (parsed.skills.length > 0) { score += 1; }
  totalChecks += 1;

  // Check education
  if (parsed.education.length > 0) { score += 1; }
  totalChecks += 1;

  return score / totalChecks;
};

/**
 * Clean and normalize resume text
 */
export const cleanResumeText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Main resume parsing function
 */
export const parseResume = async (file: File): Promise<ResumeParseResult> => {
  try {
    const text = await extractTextFromFile(file);
    const cleanedText = cleanResumeText(text);
    return parseResumeText(cleanedText);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse resume',
      confidence: 0
    };
  }
}; 