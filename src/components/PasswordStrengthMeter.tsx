import React, { useState, useEffect } from 'react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthResult {
  score: number;
  feedback: string[];
  isStrong: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const [strength, setStrength] = useState<StrengthResult>({
    score: 0,
    feedback: [],
    isStrong: false
  });

  const calculateStrength = (password: string): StrengthResult => {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 20;
    } else {
      feedback.push('Password should be at least 8 characters long');
    }

    if (password.length >= 12) {
      score += 10;
    }

    if (password.length >= 16) {
      score += 10;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Password should contain special characters');
    }

    // Pattern checks (deduct points for weak patterns) - MATCH BACKEND LOGIC
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe|password|admin/i.test(password)) {
      score -= 20;
      feedback.push('Avoid common patterns or dictionary words');
    }

    // Entropy check
    const uniqueChars = new Set(password).size;
    if (uniqueChars < 4) {
      score -= 10;
      feedback.push('Use more diverse characters');
    }

    // Bonus for very strong passwords (check current score, not future score)
    if (password.length >= 16 && uniqueChars >= 10) {
      score += 10; // Bonus for length + diversity
    }

    // Additional bonus for exceptional passwords
    if (password.length >= 20 && uniqueChars >= 15) {
      score += 10; // Extra points for truly exceptional passwords
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const isStrong = score >= 70;

    if (score < 30) {
      feedback.unshift('Password is very weak');
    } else if (score < 50) {
      feedback.unshift('Password is weak');
    } else if (score < 70) {
      feedback.unshift('Password is moderate');
    } else if (score < 90) {
      feedback.unshift('Password is strong');
    } else if (score < 100) {
      feedback.unshift('Password is very strong');
    } else {
      feedback.unshift('Password is perfect! Maximum security achieved');
    }

    return {
      score,
      feedback,
      isStrong
    };
  };

  useEffect(() => {
    if (password.length === 0) {
      setStrength({ score: 0, feedback: [], isStrong: false });
      return;
    }

    const result = calculateStrength(password);
    setStrength(result);
  }, [password]);

  const getProgressColor = (score: number): string => {
    if (score < 30) return 'bg-red-500';
    if (score < 50) return 'bg-orange-500';
    if (score < 70) return 'bg-yellow-500';
    if (score < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number): string => {
    if (score < 30) return 'Very Weak';
    if (score < 50) return 'Weak';
    if (score < 70) return 'Moderate';
    if (score < 90) return 'Strong';
    return 'Very Strong';
  };

  if (password.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password Strength:</span>
        <span className={`text-sm font-medium ${
          strength.isStrong ? 'text-green-600' : 'text-red-600'
        }`}>
          {getStrengthText(strength.score)} ({strength.score}/100)
        </span>
      </div>
      
      <div className={`h-2 w-full rounded-full overflow-hidden ${
        strength.isStrong ? 'bg-green-100' : 'bg-red-100'
      }`}>
        <div 
          className={`h-full transition-all duration-300 ${getProgressColor(strength.score)}`}
          style={{ width: `${strength.score}%` }}
        />
      </div>

      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((item, index) => (
            <div 
              key={index} 
              className={`text-xs flex items-center ${
                strength.isStrong ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span className="mr-2">
                {strength.isStrong ? '✅' : '❌'}
              </span>
              {item}
            </div>
          ))}
        </div>
      )}

      {strength.isStrong && (
        <div className="text-xs text-green-600 font-medium">
          🎉 Password meets security requirements!
        </div>
      )}
    </div>
  );
};
