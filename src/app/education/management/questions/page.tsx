import { QuestionsClient } from "./questions-client";

export const metadata = {
  title: "Soru Bankası | Eğitim Asistanı",
  description: "Soru bankası, yanlış havuzu ve test yönetimi.",
};

export default function QuestionBankPage() {
  return <QuestionsClient />;
}