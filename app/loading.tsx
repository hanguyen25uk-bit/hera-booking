export default function Loading() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Spinner */}
        <div style={styles.spinnerContainer}>
          <div style={styles.spinner} />
        </div>

        {/* Text */}
        <p style={styles.text}>Loading...</p>
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBF8F4",
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  spinnerContainer: {
    width: 48,
    height: 48,
    position: "relative",
  },
  spinner: {
    width: 48,
    height: 48,
    border: "3px solid #F3EDE4",
    borderTopColor: "#C4686D",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  text: {
    fontSize: 15,
    color: "#4A4640",
    margin: 0,
  },
};
