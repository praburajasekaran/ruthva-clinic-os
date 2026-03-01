export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Print layout renders without the sidebar
  return <>{children}</>;
}
