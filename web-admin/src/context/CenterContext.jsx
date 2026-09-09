import React, { createContext, useContext, useState, useEffect } from "react";
import { getChildren, getClassrooms } from "../services/api";
export const CenterContext = createContext(null);
export function CenterProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getChildren(), getClassrooms()])
      .then(([studentsData, classroomsData]) => {
        if (active) {
          setStudents(studentsData);
          setClassrooms(classroomsData);
        }
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <CenterContext.Provider
      value={{
        students,
        setStudents,
        classrooms,
        loading,
        error,
        retry: () => setAttempt((n) => n + 1),
      }}
    >
      {children}
    </CenterContext.Provider>
  );
}
export function useCenterContext() {
  return useContext(CenterContext);
}
