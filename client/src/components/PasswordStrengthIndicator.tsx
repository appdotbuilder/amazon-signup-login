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
        return 'from-red-400 to-red-600';
      case 2:
      case 3:
        return 'from-yellow-400 to-orange-500';
      case 4:
        return 'from-blue-400 to-blue-600';
      case 5:
        return 'from-green-400 to-emerald-600';
      default:
        return 'from-red-400 to-red-600';
    }
  };

  const getStrengthEmoji = (strength: number): string => {
    switch (strength) {
      case 0:
      case 1:
        return '🔴';
      case 2:
      case 3:
        return '🟡';
      case 4:
        return '🔵';
      case 5:
        return '🟢';
      default:
        return '🔴';
    }
  };

  const getRequirements = (password: string) => {
    return [
      {
        text: 'At least 8 characters',
        met: password.length >= 8,
        emoji: '📏'
      },
      {
        text: 'One lowercase letter',
        met: /[a-z]/.test(password),
        emoji: '🔤'
      },
      {
        text: 'One uppercase letter',
        met: /[A-Z]/.test(password),
        emoji: '🔠'
      },
      {
        text: 'One number',
        met: /\d/.test(password),
        emoji: '🔢'
      }
    ];
  };

  const requirements = getRequirements(password);
  const strengthLabel = getStrengthLabel(strength);
  const strengthColor = getStrengthColor(strength);
  const strengthEmoji = getStrengthEmoji(strength);

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200/50 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
          <span>🛡️</span>
          <span>Password strength:</span>
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-sm">{strengthEmoji}</span>
          <span className={`text-sm font-bold ${
            strength <= 1 ? 'text-red-600' : 
            strength <= 3 ? 'text-orange-600' : 
            strength === 4 ? 'text-blue-600' : 'text-emerald-600'
          }`}>
            {strengthLabel}
          </span>
        </div>
      </div>
      
      {/* Enhanced strength bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
        <div 
          className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${strengthColor} shadow-sm`}
          style={{ width: `${(strength / 5) * 100}%` }}
        ></div>
      </div>

      {/* Enhanced requirements list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {requirements.map((req, index) => (
          <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-300 ${
            req.met ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
          }`}>
            <div className="text-sm flex-shrink-0">
              {req.met ? '✅' : '⭕'}
            </div>
            <span className="text-sm flex items-center space-x-1">
              <span className="text-xs">{req.emoji}</span>
              <span className={`${req.met ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                {req.text}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}