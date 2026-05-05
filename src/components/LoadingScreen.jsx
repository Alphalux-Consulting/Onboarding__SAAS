export default function LoadingScreen() {
  return (
    <div style={styles.container}>
      <div style={styles.spinner}></div>
      <h2 style={styles.text}>Cargando...</h2>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    gap: '1rem'
  },
  spinner: {
    display: 'inline-block',
    width: '40px',
    height: '40px',
    border: '4px solid rgba(212, 175, 55, 0.3)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  text: {
    color: 'var(--text-primary)',
    fontSize: 'var(--font-size-lg)'
  }
}
