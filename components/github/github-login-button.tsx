/**
 * GitHub Login Button Component
 * 
 * A styled button component for GitHub OAuth authentication.
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useGitHub } from '@/hooks/use-github';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';

interface GitHubLoginButtonProps {
  clientId?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  text?: string;
}

export function GitHubLoginButton({
  clientId,
  onSuccess,
  onError,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  text,
}: GitHubLoginButtonProps) {
  const { isAuthenticated, isLoading, login, logout, user } = useGitHub();
  const { colors } = useTheme();

  const handlePress = async () => {
    try {
      if (isAuthenticated) {
        await logout();
      } else {
        const appId = clientId || process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID;
        if (!appId) {
          throw new Error('GitHub Client ID not configured. Please set EXPO_PUBLIC_GITHUB_CLIENT_ID in your .env file.');
        }
        await login(appId);
        onSuccess?.();
      }
    } catch (error) {
      console.error('GitHub login error:', error);
      onError?.(error as Error);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = [styles.button];
    
    // Size variants
    if (size === 'small') {
      baseStyles.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyles.push(styles.buttonLarge);
    }

    // Color variants
    if (variant === 'primary') {
      baseStyles.push({ backgroundColor: '#24292e' });
    } else if (variant === 'secondary') {
      baseStyles.push({ backgroundColor: colors.secondary });
    } else if (variant === 'outline') {
      baseStyles.push([styles.outlineButton, { borderColor: '#24292e' }]);
    }

    if (disabled || isLoading) {
      baseStyles.push(styles.disabledButton);
    }

    return baseStyles;
  };

  const getTextStyles = () => {
    const baseStyles = [styles.buttonText];
    
    if (size === 'small') {
      baseStyles.push(styles.textSmall);
    } else if (size === 'large') {
      baseStyles.push(styles.textLarge);
    }

    if (variant === 'outline') {
      baseStyles.push({ color: '#24292e' });
    } else {
      baseStyles.push({ color: '#ffffff' });
    }

    if (disabled || isLoading) {
      baseStyles.push(styles.disabledText);
    }

    return baseStyles;
  };

  const getButtonText = () => {
    if (isLoading) {
      return 'Autenticando...';
    }
    
    if (text) {
      return text;
    }

    if (isAuthenticated && user) {
      return `Sair como ${user.login}`;
    }

    return 'Entrar com GitHub';
  };

  return (
    <TouchableOpacity
      style={getButtonStyles()}
      onPress={handlePress}
      disabled={disabled || isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator 
            size="small" 
            color={variant === 'outline' ? '#24292e' : '#ffffff'} 
          />
        ) : (
          <>
            {!isAuthenticated && (
              <Ionicons
                name="logo-github"
                size={size === 'small' ? 16 : size === 'large' ? 28 : 20}
                color={variant === 'outline' ? '#24292e' : '#ffffff'}
                style={styles.icon}
              />
            )}
            <Text style={getTextStyles()}>
              {getButtonText()}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buttonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  textSmall: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 17,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default GitHubLoginButton;
