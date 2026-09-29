const path = require('path');
const backendNodeModules = path.resolve(__dirname, '../hrms2.0-backend-develop/node_modules');

let mongoose, bcrypt;
try {
  mongoose = require(path.join(backendNodeModules, 'mongoose'));
  bcrypt = require(path.join(backendNodeModules, 'bcryptjs'));
} catch (e) {
  mongoose = require('mongoose');
  bcrypt = require('bcryptjs');
}

const MONGO_URI = process.env.MONGO_DB_URI || 'mongodb://127.0.0.1:27017/hrms';

const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@quantumcloud.com';
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin@123456';
const firstName = process.argv[4] || 'Super';
const lastName = process.argv[5] || 'Admin';
const username = email.split('@')[0] || 'admin';

async function createSuperAdmin() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGO_URI}`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const usersCollection = mongoose.connection.collection('users');

    const existingUser = await usersCollection.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    if (existingUser) {
      console.log(`User found with email '${email}'. Updating to Super Admin...`);
      await usersCollection.updateOne(
        { _id: existingUser._id },
        {
          $set: {
            password: hashedPassword,
            position: ['HR', 'Operation Manager', 'Workforce'],
            archived: false,
            firstName,
            lastName,
            updatedAt: now,
          }
        }
      );
      console.log('\n==================================================');
      console.log(' SUPER ADMIN ACCOUNT UPDATED SUCCESSFULLY');
      console.log('==================================================');
    } else {
      const adminDoc = {
        username: username.toLowerCase(),
        password: hashedPassword,
        email: email.toLowerCase(),
        firstName,
        lastName,
        idNumber: 'QC-0001',
        position: ['HR', 'Operation Manager', 'Workforce'],
        archived: false,
        salaryType: 'monthly',
        salary: 0,
        workInfo: 'Corporate Headquarters',
        location: 'Main Office',
        gender: 'Not Specified',
        createdAt: now,
        updatedAt: now,
      };

      await usersCollection.insertOne(adminDoc);
      console.log('\n==================================================');
      console.log(' SUPER ADMIN ACCOUNT CREATED SUCCESSFULLY');
      console.log('==================================================');
    }

    console.log(`Email:     ${email}`);
    console.log(`Password:  ${password}`);
    console.log(`Roles:     HR, Operation Manager, Workforce (Full System Access)`);
    console.log(`URL:       http://localhost:9000/login`);
    console.log('==================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Failed to create/update super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
