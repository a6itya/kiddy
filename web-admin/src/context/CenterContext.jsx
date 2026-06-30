import React, { createContext, useContext, useState, useEffect } from 'react';
import { getChildren, getClassrooms } from '../services/api';

export const CenterContext = createContext(null);

export function CenterProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [studentsData, classroomsData] = await Promise.all([
          getChildren(),
          getClassrooms(),
        ]);
        setStudents(studentsData);
        setClassrooms(classroomsData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  return (
    <CenterContext.Provider value={{ students, setStudents, classrooms, setClassrooms, loading }}>
      {children}
    </CenterContext.Provider>
  );
}

export function useCenterContext() {
  return useContext(CenterContext);
}
