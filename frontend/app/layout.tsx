import './globals.css';

export const metadata = {
  title: 'AI Order Control Tower',
  description: 'Production order operations and RCA control tower',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
