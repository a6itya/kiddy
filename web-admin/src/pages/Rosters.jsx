import React, { useState, useContext } from 'react'; // <-- Add useContext
import { CenterContext } from '../context/CenterContext'; // <-- Import the vault

export default function Rosters() {
  // 1. Pull global state instead of using local state
  const {students, setStudents } = useContext(CenterContext);

  const [searchTerm, setSearchTerm] = useState('');

  // 2. Modal State Management
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Tracks if we are adding or editing
  const [formData, setFormData] = useState({
    id: null, firstName: '', lastName: '', age: '', room: 'Toddler Room', parent: '', contact: '', allergies: '', status: 'Active'
  });

  // Filter Logic
  const filteredStudents = students.filter(student => 
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.parent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Core Functions ---

  const openAddModal = () => {
    setFormData({ id: null, firstName: '', lastName: '', age: '', room: 'Toddler Room', parent: '', contact: '', allergies: '', status: 'Active' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setFormData(student);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault(); // Prevents page reload on submit
    if (isEditing) {
      // Find the specific student and update their record
      setStudents(students.map(s => s.id === formData.id ? formData : s));
    } else {
      // Add new student (using Date.now() as a temporary unique ID until we connect PostgreSQL)
      setStudents([...students, { ...formData, id: Date.now() }]);
    }
    closeModal();
  };

  const handleDelete = () => {
    // Built-in browser confirmation to prevent accidental deletions
    if (window.confirm(`Are you sure you want to completely remove ${formData.firstName} ${formData.lastName} from the system?`)) {
      setStudents(students.filter(s => s.id !== formData.id));
      closeModal();
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Student Rosters</h1>
          <p className="text-slate-500 mt-1">Manage enrollments, classrooms, and families.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Add Student
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex space-x-4">
        <input 
          type="text" 
          placeholder="Search students or parents..." 
          className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select className="border border-slate-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option>All Classrooms</option>
          <option>Toddler Room</option>
          <option>Preschool Explorers</option>
          <option>Pre-K Readiness</option>
        </select>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600 uppercase tracking-wider">
              <th className="p-4">Student Name</th>
              <th className="p-4">Age</th>
              <th className="p-4">Classroom</th>
              <th className="p-4">Primary Contact</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium">{student.firstName} {student.lastName}</td>
                <td className="p-4 text-slate-500">{student.age}</td>
                <td className="p-4">{student.room}</td>
                <td className="p-4 text-indigo-600 hover:underline cursor-pointer">
                  {student.parent}
                  <div className="text-xs text-slate-400 no-underline">{student.contact}</div>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    student.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    {student.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => openEditModal(student)}
                    className="text-slate-400 hover:text-indigo-600 font-medium text-sm transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  No students found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Overlay Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-800">
                {isEditing ? 'Edit Student Profile' : 'Add New Student'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-2xl font-semibold">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Grid Layout for Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input type="text" name="firstName" required value={formData.firstName} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input type="text" name="lastName" required value={formData.lastName} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age / DOB</label>
                  <input type="text" name="age" required value={formData.age} onChange={handleInputChange} placeholder="e.g. 2 yrs or 05/12/2022" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Classroom</label>
                  <select name="room" value={formData.room} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                    <option>Toddler Room</option>
                    <option>Preschool Explorers</option>
                    <option>Pre-K Readiness</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent/Guardian Name</label>
                  <input type="text" name="parent" required value={formData.parent} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input type="text" name="contact" required value={formData.contact} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Known Allergies / Medical Notes</label>
                  <input type="text" name="allergies" value={formData.allergies} onChange={handleInputChange} placeholder="e.g. Peanuts, Dairy, None" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                    <option>Active</option>
                    <option>Waitlist</option>
                    <option>Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                {/* Only show Delete if we are editing an existing record */}
                {isEditing ? (
                  <button type="button" onClick={handleDelete} className="text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg font-medium transition-colors">
                    Remove Student
                  </button>
                ) : (
                  <div></div> /* Empty div to keep the right-side buttons aligned */
                )}
                
                <div className="flex space-x-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                    {isEditing ? 'Save Changes' : 'Enroll Student'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}