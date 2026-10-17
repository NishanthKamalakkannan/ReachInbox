import { Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import { campaignService } from '../services/campaign.service';

export class CampaignController {
  async getCampaigns(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const campaigns = await campaignService.getCampaigns(userId);

    res.json({
      success: true,
      data: campaigns,
    });
  }

  async getCampaignById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { id } = req.params;

    const campaign = await campaignService.getCampaignById(id, userId);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Campaign not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: campaign,
    });
  }

  async getSenders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.id;
    const senders = await campaignService.getUserSenders(userId);

    res.json({
      success: true,
      data: senders,
    });
  }
}

export const campaignController = new CampaignController();
