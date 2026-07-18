// Priorities are assigned here (server-side) rather than trusted from the client,
// mirroring the categoryConfig map in frontend/index.html.
const CATEGORIES = {
  bullying: { label: 'Bullying and Harassment', priority: 'High' },
  'child-protection': { label: 'Child Protection Concern', priority: 'High' },
  facilities: { label: 'School Facilities and Maintenance', priority: 'Medium' },
  safety: { label: 'Safety and Security', priority: 'High' },
  suggestion: { label: 'Suggestions and Recommendations', priority: 'Low' },
  appreciation: { label: 'Appreciation and Recognition', priority: 'Low' },
  teacher: { label: 'Teacher or Staff Concern', priority: 'Medium' },
  others: { label: 'Others', priority: 'Medium' },
  academic: { label: 'Academic Concerns', priority: 'Medium' },
  environment: { label: 'Environmental Concern', priority: 'Medium' },
  health: { label: 'Health and Sanitation', priority: 'Medium' },
  ict: { label: 'ICT and Technology', priority: 'Medium' },
  'student-conduct': { label: 'Student Conduct', priority: 'Medium' },
  'event-feedback': { label: 'School Event Feedback', priority: 'Low' },
  'sslg-feedback': { label: 'SSLG Programs and Services', priority: 'Low' }
};

// Fields captured by each category's dynamic form section on the student portal.
const CATEGORY_DETAIL_FIELDS = {
  bullying: ['incident_time', 'persons_involved', 'witnesses'],
  'child-protection': ['persons_involved'],
  facilities: ['building', 'room_number'],
  safety: ['immediate_danger', 'hazard_type'],
  suggestion: ['expected_benefits', 'estimated_impact'],
  appreciation: ['recognized_person', 'recognition_reason'],
  teacher: ['teacher_staff_name', 'department']
};

module.exports = { CATEGORIES, CATEGORY_DETAIL_FIELDS };
