"use client";
import { useEffect, useState } from "react";

interface Property {
  _id: string;
  name: string;
}

export default function PropertiesPage() {
  const [name, setName] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then(setProperties);
  }, []);

  const addProperty = async () => {
    await fetch("/api/properties", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setName("");
    location.reload();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Properties</h1>

      <input
        className="border p-2 mr-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Property name"
      />

      <button className="bg-black text-white px-4 py-2" onClick={addProperty}>
        Add
      </button>

      <ul className="mt-4">
        {properties.map((p) => (
          <li key={p._id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
}
