// Initialize DevShare MongoDB database with collections and indexes

// Switch to devshare database
db = db.getSiblingDB('devshare');

// Create users collection with indexes
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ created_at: 1 });

// Create projects collection with indexes
db.createCollection('projects');
db.projects.createIndex({ owner_id: 1 });
db.projects.createIndex({ created_at: 1 });

// Create project_files collection with indexes
db.createCollection('project_files');
db.project_files.createIndex({ project_id: 1 });
db.project_files.createIndex({ project_id: 1, file_path: 1 }, { unique: true });

// Create room_sessions collection with indexes
db.createCollection('room_sessions');
db.room_sessions.createIndex({ project_id: 1 });
db.room_sessions.createIndex({ room_id: 1 }, { unique: true });
db.room_sessions.createIndex({ created_at: 1 });
db.room_sessions.createIndex({ ended_at: 1 });

// Create session_events collection with indexes
db.createCollection('session_events');
db.session_events.createIndex({ room_id: 1 });
db.session_events.createIndex({ user_id: 1 });
db.session_events.createIndex({ created_at: 1 });
db.session_events.createIndex({ room_id: 1, type: 1, created_at: 1 });

// Create execution_logs collection with indexes
db.createCollection('execution_logs');
db.execution_logs.createIndex({ room_id: 1 });
db.execution_logs.createIndex({ created_at: 1 });

// Create code_versions collection with indexes
db.createCollection('code_versions');
db.code_versions.createIndex({ project_id: 1 });
db.code_versions.createIndex({ file_id: 1 });
db.code_versions.createIndex({ created_at: 1 });

// Create code_analysis results collection
db.createCollection('code_analysis');
db.code_analysis.createIndex({ file_id: 1 });
db.code_analysis.createIndex({ project_id: 1 });
db.code_analysis.createIndex({ created_at: 1 });

// Create tasks collection
db.createCollection('tasks');
db.tasks.createIndex({ project_id: 1 });
db.tasks.createIndex({ created_by: 1 });
db.tasks.createIndex({ created_at: 1 });

// Create questionnaires collection
db.createCollection('questionnaires');
db.questionnaires.createIndex({ created_at: 1 });

print('✅ DevShare MongoDB collections and indexes initialized successfully!');
