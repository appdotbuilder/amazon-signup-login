interface PasswordStrengthIndicatorProps {
  strength: number;
  password: string;
}

export function PasswordStrengthIndicator({ strength, password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const getStrengthLabel = (strength: number): string => {
    switch (strength) {
      case 0:
      case 1:
        return 'Weak';
      case 2:
      case 3:
        return 'Fair';
      case 4:
        return 'Good';
      case 5:
        return 'Strong';
      default:
        return 'Weak';
    }
  };

  const getStrengthColor = (strength: number): string => {
    switch (strength) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-blue-500';
      case 5:
        return 'bg-green-500';
      default:
        return 'bg-red-500';
    }
  };

  const getRequirements = (password: string) => {
    return [
      {
        text: 'At least 8 characters',
        met: password.length >= 8
      },
      {
        text: 'One lowercase letter',
        met: /[a-z]/.test(password)
      },
      {
        text: 'One uppercase letter',
        met: /[A-Z]/.test(password)
      },
      {
        text: 'One number',
        met: /\d/.test(password)
      }
    ];
  };

  const requirements = getRequirements(password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">Password strength:</span>
        <span className={`text-xs font-medium ${
          strength <= 1 ? 'text-red-600' : 
          strength <= 3 ? 'text-yellow-600' : 
          strength === 4 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {strengthLabel}
        </span>
      </div>
      
      {/* Strength bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${strengthColor}`}
          style={{ width: `${(strength / 5) * 100}%` }}
        ></div>
      </div>

      {/* Requirements list */}
      <div className="space-y-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-400'}`}>
              {req.met ? '✓' : '○'}
            </div>
            <span className={`text-xs ${req.met ? 'text-green-600' : 'text-gray-600'}`}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}