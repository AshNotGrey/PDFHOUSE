"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Minimize2, Maximize2, FileText } from "lucide-react";

const allJSONFiles = import.meta.glob("/src/JSON/**/*.json");

function Doc({ name, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-[#00CCFF] text-white px-4 py-3 rounded-xl font-medium shadow hover:bg-[#00b0e6] transition flex items-center gap-2 max-w-xs break-words duration-200"
    >
      <FileText size={18} />
      <span className="truncate">{name}</span>
    </a>
  );
}

function CourseSection({ title, docs }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6 text-left">
      <button
        className="flex items-center justify-between w-full px-4 py-3 text-lg font-semibold transition-colors duration-200 bg-gray-100 rounded-lg shadow hover:bg-gray-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">({docs.length} files)</span>
          {isOpen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 mt-4 rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc, index) => (
              <Doc key={index} name={doc.name} href={doc.href} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 🔁 Helper to convert loaded JSON structure into course sections
function parseSections(data) {
  return Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return { title: key.toUpperCase(), docs: value };
      }
      if (typeof value === "object") {
        return Object.entries(value).map(([subKey, docs]) => ({
          title: subKey.toUpperCase(),
          docs: docs,
        }));
      }
      return null;
    })
    .flat()
    .filter(Boolean);
}

function PDFViewer({ BackButton }) {
  const location = useLocation();
  const { level, college, department, semester } = location.state || {};

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPDFs = async () => {
      setLoading(true);
      setError(null);

      if (!level || !college || !semester || !department) {
        setSections([]);
        setLoading(false);
        return;
      }

      const formattedCollege = college.toLowerCase();
      const formattedSemester = `${semester.toLowerCase()}-semester`;
      const formattedDepartment = department.split(" ")[0].toLowerCase();

      const departmentPath = `/src/JSON/${level}/${formattedCollege}/${formattedSemester}/${formattedDepartment}.json`;
      const generalPath = `/src/JSON/${level}/${formattedCollege}/${formattedSemester}/general.json`;

      try {
        let combinedSections = [];

        // Load department-specific materials
        if (allJSONFiles[departmentPath]) {
          const deptModule = await allJSONFiles[departmentPath]();
          const deptData = deptModule.default;
          const deptSections = parseSections(deptData);
          combinedSections = [...combinedSections, ...deptSections];
        }

        // Load general course materials for the same college & semester
        if (allJSONFiles[generalPath]) {
          const generalModule = await allJSONFiles[generalPath]();
          const generalData = generalModule.default;

          if (Array.isArray(generalData)) {
            combinedSections.push({ title: "GENERAL", docs: generalData });
          } else {
            const generalSections = parseSections(generalData);
            combinedSections.push(
              ...generalSections.map((section) => ({
                ...section,
                title: `GENERAL - ${section.title}`,
              }))
            );
          }
        }

        if (combinedSections.length === 0) {
          throw new Error("No course materials found.");
        }

        setSections(combinedSections);
      } catch (err) {
        console.error("Load error:", err.message);
        setError(
          `Failed to load course materials. Could not find: ${departmentPath}`
        );
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    loadPDFs();
  }, [level, college, department, semester]);

  return (
    <div className="max-w-6xl px-4 py-8 mx-auto">
      <header className="mb-8">
        <BackButton />
        <div className="mt-4 text-center">
          <h1 className="mb-2 text-2xl font-bold text-gray-800">
            Course Materials
          </h1>
          <p className="mb-1 text-gray-600">
            Access and download course materials for {department || "N/A"}
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span>College: {college || "N/A"}</span>
            <span>|</span>
            <span>Level: {level || "N/A"}</span>
            <span>|</span>
            <span>Semester: {semester || "N/A"}</span>
          </div>
        </div>
      </header>

      <main>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CCFF] mb-4"></div>
            <p className="text-gray-500">Loading course materials...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <div className="max-w-md p-6 mx-auto border border-red-200 rounded-lg bg-red-50">
              <p className="mb-2 text-red-600">{error}</p>
              <p className="text-sm text-gray-500">
                Make sure the JSON file exists in the correct location.
              </p>
            </div>
          </div>
        ) : sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map(({ title, docs }, index) => (
              <CourseSection key={index} title={title} docs={docs} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="max-w-md p-8 mx-auto border border-gray-200 rounded-lg bg-gray-50">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="mb-2 text-lg text-gray-500">No materials found</p>
              <p className="text-sm text-gray-400">
                No PDFs found for this department, level, or semester.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default PDFViewer;
