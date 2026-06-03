import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const icon = require("../assets/images/icon.png");

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export function Logo({ size = "md" }: LogoProps) {
  const colors = useColors();
  const imgSize = size === "lg" ? 48 : size === "md" ? 36 : 28;
  const fontSize = size === "lg" ? 28 : size === "md" ? 20 : 16;

  return (
    <View style={styles.row}>
      <Image
        source={icon}
        style={{
          width: imgSize,
          height: imgSize,
          borderRadius: imgSize * 0.22,
        }}
        resizeMode="cover"
      />
      <View style={{ marginLeft: 10 }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_700Bold",
            fontSize,
            letterSpacing: -0.5,
            lineHeight: fontSize * 1.1,
          }}
        >
          Jatek
          <Text style={{ color: colors.primary }}> Drive</Text>
        </Text>
        <Text
          style={{
            color: colors.mutedForeground,
            fontFamily: "Inter_500Medium",
            fontSize: fontSize * 0.6,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Livreur
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
