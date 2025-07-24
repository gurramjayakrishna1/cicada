import { useEffect, useState } from "react";

export default function ObjectivePicker({ onSelect, onBack }) {
  const [groupedObjectives, setGroupedObjectives] = useState({});

  useEffect(() => {
    async function fetchLOs() {
      const res = await fetch("http://localhost:8000/api/objectives");
      const data = await res.json();

      const grouped = {};
      for (const lo of data) {
        const topic = lo.topic;
        if (!grouped[topic]) {
          grouped[topic] = [];
        }
        grouped[topic].push(lo);
      }

      setGroupedObjectives(grouped);
    }

    fetchLOs();
  }, []);

  return (
    <div className="text-left space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-blue-700">Select a Learning Objective:</h2>
        <button
          onClick={onBack}
          className="text-sm text-blue-600 underline"
        >
          ⬅ Back to Menu
        </button>
      </div>

      {Object.entries(groupedObjectives).map(([topic, objectives]) => (
        <div key={topic}>
          <h3 className="text-md font-bold text-gray-800 mb-2">{topic}</h3>
          <ul className="space-y-1">
            {objectives.map((lo) => (
              <li key={lo.id}>
                <button
                  onClick={() => onSelect(lo)}
                  className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-blue-100 rounded"
                >
                  {lo.objective}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
