import { WordCloud } from "./components/WordCloud";
import { initialData } from "./data/initialData";
import "./styles/index.css";

export default function App() {
  return <WordCloud data={initialData} />;
}
