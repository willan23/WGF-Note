import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useColors } from '@/hooks/use-colors';

type WorkbenchRoute = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  path: '/(tabs)' | '/(tabs)/files' | '/(tabs)/symbols' | '/(tabs)/terminal' | '/(tabs)/cloud' | '/(tabs)/settings';
  matches: (pathname: string) => boolean;
};

const PRIMARY_ROUTES: WorkbenchRoute[] = [
  {
    key: 'editor',
    label: 'Editor',
    icon: 'code-slash-outline',
    path: '/(tabs)',
    matches: (pathname) => pathname === '/' || pathname === '/index',
  },
  {
    key: 'files',
    label: 'Ficheiros',
    icon: 'folder-open-outline',
    path: '/(tabs)/files',
    matches: (pathname) => pathname.includes('/files'),
  },
  {
    key: 'symbols',
    label: 'Símbolos',
    icon: 'cube-outline',
    path: '/(tabs)/symbols',
    matches: (pathname) => pathname.includes('/symbols'),
  },
  {
    key: 'terminal',
    label: 'Terminal',
    icon: 'terminal-outline',
    path: '/(tabs)/terminal',
    matches: (pathname) => pathname.includes('/terminal'),
  },
  {
    key: 'cloud',
    label: 'Cloud',
    icon: 'cloud-outline',
    path: '/(tabs)/cloud',
    matches: (pathname) => pathname.includes('/cloud'),
  },
];

const SECONDARY_ROUTES: WorkbenchRoute[] = [
  {
    key: 'settings',
    label: 'Definições',
    icon: 'settings-outline',
    path: '/(tabs)/settings',
    matches: (pathname) => pathname.includes('/settings'),
  },
];

function ActivityButton({
  route,
  active,
  colors,
  styles,
}: {
  route: WorkbenchRoute;
  active: boolean;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={route.label}
      accessibilityState={{ selected: active }}
      onPress={() => router.push(route.path)}
      style={({ pressed }) => [
        styles.button,
        active && styles.buttonActive,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={[styles.activeMark, active && styles.activeMarkVisible]} />
      <Ionicons
        name={route.icon}
        size={22}
        color={active ? colors.foreground : colors.muted}
      />
      <Text style={[styles.buttonLabel, active && styles.buttonLabelActive]}>
        {route.label}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      width: 62,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      justifyContent: 'space-between',
      paddingVertical: 10,
    },
    group: {
      gap: 6,
    },
    button: {
      minHeight: 58,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      position: 'relative',
    },
    buttonPressed: {
      opacity: 0.78,
    },
    buttonActive: {
      backgroundColor: `${colors.primary}14`,
    },
    activeMark: {
      position: 'absolute',
      left: 0,
      top: 10,
      bottom: 10,
      width: 2,
      borderRadius: 999,
      backgroundColor: colors.primary,
      opacity: 0,
    },
    activeMarkVisible: {
      opacity: 1,
    },
    buttonLabel: {
      color: colors.muted,
      fontSize: 9,
      fontWeight: '700',
    },
    buttonLabelActive: {
      color: colors.foreground,
    },
    brand: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    brandText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
  });
}

export const WorkbenchActivityBar = memo(function WorkbenchActivityBar() {
  const colors = useColors();
  const pathname = usePathname();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.brand}>
          <Text style={styles.brandText}>WGF</Text>
        </View>
        <View style={styles.group}>
          {PRIMARY_ROUTES.map((route) => (
            <ActivityButton
              key={route.key}
              route={route}
              active={route.matches(pathname)}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        {SECONDARY_ROUTES.map((route) => (
          <ActivityButton
            key={route.key}
            route={route}
            active={route.matches(pathname)}
            colors={colors}
            styles={styles}
          />
        ))}
      </View>
    </View>
  );
});
