import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";

// Helper function to convert HTML to react-pdf components
export const renderHtmlToPdf = (html: string) => {
  if (!html) return <Text></Text>;

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const renderNode = (node: Node): React.ReactNode[] => {
    const results: React.ReactNode[] = [];

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        results.push(
          <Text key={Math.random()} style={styles.normalText}>
            {text}
          </Text>
        );
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const children = Array.from(element.childNodes)
        .map(renderNode)
        .flat();

      switch (tagName) {
        case "p":
          results.push(
            <View key={Math.random()} style={styles.paragraph}>
              {children}
            </View>
          );
          break;
        case "h1":
          results.push(
            <Text key={Math.random()} style={styles.h1}>
              {element.textContent}
            </Text>
          );
          break;
        case "h2":
          results.push(
            <Text key={Math.random()} style={styles.h2}>
              {element.textContent}
            </Text>
          );
          break;
        case "h3":
          results.push(
            <Text key={Math.random()} style={styles.h3}>
              {element.textContent}
            </Text>
          );
          break;
        case "h4":
          results.push(
            <Text key={Math.random()} style={styles.h4}>
              {element.textContent}
            </Text>
          );
          break;
        case "h5":
          results.push(
            <Text key={Math.random()} style={styles.h5}>
              {element.textContent}
            </Text>
          );
          break;
        case "h6":
          results.push(
            <Text key={Math.random()} style={styles.h6}>
              {element.textContent}
            </Text>
          );
          break;
        case "ul":
          results.push(
            <View key={Math.random()} style={styles.ul}>
              {children}
            </View>
          );
          break;
        case "ol":
          results.push(
            <View key={Math.random()} style={styles.ol}>
              {children}
            </View>
          );
          break;
        case "li": {
          // Determine if parent is ul or ol
          const parentTag = element.parentElement?.tagName.toLowerCase();
          const isUnordered = parentTag === "ul";
          // For ordered lists, try to get the index from siblings
          let listMarker = "•";
          if (!isUnordered && parentTag === "ol") {
            const siblings = element.parentElement 
              ? Array.from(element.parentElement.children)
              : [];
            const index = siblings.indexOf(element);
            listMarker = `${index + 1}.`;
          }
          results.push(
            <View key={Math.random()} style={styles.li}>
              <Text style={styles.liMarker}>{listMarker} </Text>
              <View style={styles.liContent}>{children}</View>
            </View>
          );
          break;
        }
        case "strong":
        case "b":
          results.push(
            <Text key={Math.random()} style={styles.bold}>
              {element.textContent}
            </Text>
          );
          break;
        case "em":
        case "i":
          results.push(
            <Text key={Math.random()} style={styles.italic}>
              {element.textContent}
            </Text>
          );
          break;
        case "br":
          results.push(<Text key={Math.random()}>{"\n"}</Text>);
          break;
        case "div":
          results.push(
            <View key={Math.random()} style={styles.div}>
              {children}
            </View>
          );
          break;
        default:
          // For other tags, just render children
          results.push(...children);
      }
    }

    return results;
  };

  const nodes = Array.from(tempDiv.childNodes)
    .map(renderNode)
    .flat();

  return <View>{nodes}</View>;
};

const styles = StyleSheet.create({
  normalText: {
    fontSize: 12,
    lineHeight: 1.6,
    color: "#000000",
  },
  paragraph: {
    marginBottom: 12,
  },
  h1: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 1.4,
  },
  h2: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  h3: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  ul: {
    marginBottom: 12,
    marginLeft: 0,
  },
  ol: {
    marginBottom: 12,
    marginLeft: 0,
  },
  li: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 0,
  },
  liMarker: {
    fontSize: 12,
    marginRight: 8,
  },
  liContent: {
    flex: 1,
  },
  bold: {
    fontWeight: "bold",
    fontSize: 12,
  },
  italic: {
    fontStyle: "italic",
    fontSize: 12,
  },
  div: {
    marginBottom: 8,
  },
});

