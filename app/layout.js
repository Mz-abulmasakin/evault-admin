
import "./global.css";

export const metadata = {
  title: "eVault Admin",
  description: "eVault administration portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
