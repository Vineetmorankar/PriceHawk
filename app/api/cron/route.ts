// import { NextResponse } from "next/server";

// import { getLowestPrice, getHighestPrice, getAveragePrice, getEmailNotifType } from "@/lib/utils";
// import { connectToDB } from "@/lib/mongoose";
// import Product from "@/lib/models/product.model";
// import { scrapeAmazonProduct } from "@/lib/scraper";
// import { generateEmailBody, sendEmail } from "@/lib/nodemailer";

// export const maxDuration = 300; // This function can run for a maximum of 300 seconds
// export const dynamic = "force-dynamic";
// export const revalidate = 0;

// export async function GET(request: Request) {
//   try {
//     await connectToDB();

//     const products = await Product.find({});

//     if (!products) throw new Error("No product fetched");

//     // ======================== 1 SCRAPE LATEST PRODUCT DETAILS & UPDATE DB
//     const updatedProducts = await Promise.all(
//       products.map(async (currentProduct) => {
//         // Scrape product
//         const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

//         if (!scrapedProduct) return;

//         const updatedPriceHistory = [
//           ...currentProduct.priceHistory,
//           {
//             price: scrapedProduct.currentPrice,
//           },
//         ];

//         const product = {
//           ...scrapedProduct,
//           priceHistory: updatedPriceHistory,
//           lowestPrice: getLowestPrice(updatedPriceHistory),
//           highestPrice: getHighestPrice(updatedPriceHistory),
//           averagePrice: getAveragePrice(updatedPriceHistory),
//         };

//         // Update Products in DB
//         const updatedProduct = await Product.findOneAndUpdate(
//           {
//             url: product.url,
//           },
//           product
//         );

//         // ======================== 2 CHECK EACH PRODUCT'S STATUS & SEND EMAIL ACCORDINGLY
//         const emailNotifType = getEmailNotifType(
//           scrapedProduct,
//           currentProduct
//         );

//         if (emailNotifType && updatedProduct.users.length > 0) {
//           const productInfo = {
//             title: updatedProduct.title,
//             url: updatedProduct.url,
//           };
//           // Construct emailContent
//           const emailContent = await generateEmailBody(productInfo, emailNotifType);
//           // Get array of user emails
//           const userEmails = updatedProduct.users.map((user: any) => user.email);
//           // Send email notification
//           await sendEmail(emailContent, userEmails);
//         }

//         return updatedProduct;
//       })
//     );

//     return NextResponse.json({
//       message: "Ok",
//       data: updatedProducts,
//     });
//   } catch (error: any) {
//     throw new Error(`Failed to get all products: ${error.message}`);
//   }
// }
import { NextResponse } from "next/server";
import { getLowestPrice, getHighestPrice, getAveragePrice, getEmailNotifType } from "@/lib/utils";
import { connectToDB } from "@/lib/mongoose";
import Product from "@/lib/models/product.model";
import { scrapeAmazonProduct } from "@/lib/scraper";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";

export const maxDuration = 60; // This function can run for a maximum of 300 seconds
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Await the database connection to ensure it's established
    await connectToDB();

    const products = await Product.find({});
    if (!products || products.length === 0) throw new Error("No products fetched");

    // Scrape product details and update DB in parallel
    const updatedProducts = await Promise.all(
      products.map(async (currentProduct) => {
        try {
          // Scrape the product from the given URL
          const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

          if (!scrapedProduct) {
            console.error(`Failed to scrape product: ${currentProduct.url}`);
            return null;
          }

          const updatedPriceHistory = [
            ...currentProduct.priceHistory,
            { price: scrapedProduct.currentPrice },
          ];

          const product = {
            ...scrapedProduct,
            priceHistory: updatedPriceHistory,
            lowestPrice: getLowestPrice(updatedPriceHistory),
            highestPrice: getHighestPrice(updatedPriceHistory),
            averagePrice: getAveragePrice(updatedPriceHistory),
          };

          // Update the product in the database
          const updatedProduct = await Product.findOneAndUpdate(
            { url: product.url },
            product,
            { new: true }
          );

          // Check if an email notification needs to be sent
          const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct);

          if (emailNotifType && updatedProduct?.users.length > 0) {
            const productInfo = {
              title: updatedProduct.title,
              url: updatedProduct.url,
            };
            const emailContent = await generateEmailBody(productInfo, emailNotifType);
            const userEmails = updatedProduct.users.map((user: any) => user.email);

            // Send email notifications
            await sendEmail(emailContent, userEmails);
          }

          return updatedProduct;
        } catch (err) {
          console.error(`Error updating product ${currentProduct.url}:`, err);
          return null;
        }
      })
    );

    // Filter out any null products from failed updates
    const successfulUpdates = updatedProducts.filter((product) => product !== null);

    return NextResponse.json({
      message: "Ok",
      data: successfulUpdates,
    });
  } catch (error: any) {
    console.error("Failed to get all products:", error);
    return NextResponse.json({ error: `Failed to get all products: ${error.message}` });
  }
}
