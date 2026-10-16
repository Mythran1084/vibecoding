import { Montserrat } from "next/font/google";
import "./globals.css";
import DeployWidget from "../components/DeployWidget";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata = {
  title: "Reserva de Salas",
  description: "Consultar salas e reservar por data e hora",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {process.env.NODE_ENV === "development" && <DeployWidget />}
      </body>
    </html>
  );
}
