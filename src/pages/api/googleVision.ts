import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';

const client = new ImageAnnotatorClient();

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