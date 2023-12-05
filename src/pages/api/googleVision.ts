import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';

export const getGCPCredentials = () => {
  // for Vercel, use environment variables
  return process.env.GCP_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY,
        },
        projectId: process.env.GCP_PROJECT_ID,
      }
      // for local development, use gcloud CLI
    : {};
};

//local testing
// const client = new ImageAnnotatorClient();

//prod
const client = new ImageAnnotatorClient(getGCPCredentials());

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { image, imageURL } = req.body;

  if (!imageURL && !image) {
    res.status(400).json({ error: 'Image URL is required' });
    return;
  }

  try {
    if(imageURL){
      console.log('url used')
      const [result] = await client.textDetection({
        image: {
          source: {
            imageUri: imageURL
          }
        },
      });
      const detections = result.textAnnotations;
      res.status(200).json({ detections });
    }
    else if(image){
      console.log('image used')
      const [result] = await client.textDetection({
        image: {
          content: image
        },
      });
      const detections = result.textAnnotations;
      res.status(200).json({ detections });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};

export default handler;