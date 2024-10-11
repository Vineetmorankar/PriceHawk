// import mongoose from 'mongoose';

// let isConnected = false;// Variable to track the connection status

// export const connectToDB = async () => {
//   mongoose.set('strictQuery', true);

//   if(!process.env.MONGODB_URI) return console.log('MONGODB_URI is not defined');

//   if(isConnected) return console.log('=> using existing database connection');

//   try {
//     await mongoose.connect(process.env.MONGODB_URI);

//     isConnected = true;

//     console.log('MongoDB Connected');
//   } catch (error) {
//     console.log(error)
//   }
// }

import mongoose from 'mongoose';

let isConnected = false; // Variable to track the connection status

export const connectToDB = async () => {
  mongoose.set('strictQuery', true);

  if (!process.env.MONGODB_URI) {
    return console.log('MONGODB_URI is not defined');
  }

  if (isConnected) {
    return console.log('=> using existing database connection');
  }

  try {
    // Setting connection options with a timeout
    await mongoose.connect(process.env.MONGODB_URI, {
      //useNewUrlParser: true,
      //useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // Set a higher timeout for connecting to the database
      socketTimeoutMS: 45000,          // Optional: Adjust socket timeout
    });

    isConnected = true;
    console.log('MongoDB Connected');
  } catch (error) {
    console.log('Error connecting to MongoDB:', error);
  }
};
