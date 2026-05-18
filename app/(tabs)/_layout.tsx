import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { useMemo } from "react";
import { useColors } from "@/hooks/use-colors";
import { WorkbenchActivityBar } from "@/components/workbench-activity-bar";

export default function TabLayout() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        shell: {
          flex: 1,
          flexDirection: "row",
          backgroundColor: colors.background,
        },
        content: {
          flex: 1,
          backgroundColor: colors.background,
        },
      }),
    [colors.background],
  );

  return (
    <View style={styles.shell}>
      <WorkbenchActivityBar />
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: "none" },
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Editor" }} />
          <Tabs.Screen name="files" options={{ title: "Ficheiros" }} />
          <Tabs.Screen name="symbols" options={{ title: "Símbolos" }} />
          <Tabs.Screen name="terminal" options={{ title: "Terminal" }} />
          <Tabs.Screen name="cloud" options={{ title: "Cloud" }} />
          <Tabs.Screen name="settings" options={{ title: "Definições" }} />
        </Tabs>
      </View>
    </View>
  );
}
