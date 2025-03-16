import { Test, TestingModule } from '@nestjs/testing';
import { CardsService } from './cards.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCardDto } from './dto/card.dto';

describe('CardsService', () => {
  let service: CardsService;

  // Mock PrismaService
  const mockPrismaService = {
    card: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService, // Use the mock instead of real PrismaService
        },
      ],
    }).compile();

    service = module.get<CardsService>(CardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCard', () => {
    it('should successfully create a card', async () => {
      // Prepare test data
      const createCardDto: CreateCardDto = {
        module_id: '1',
        front_text: 'Test Front',
        back_text: 'Test Back',
        image_url: 'test.jpg',
        tts_audio_url: 'test.mp3',
      };

      const expectedResult = {
        id: 1,
        module_id: 1,
        front_text: 'Test Front',
        back_text: 'Test Back',
        image_url: 'test.jpg',
        tts_audio_url: 'test.mp3',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the create method
      mockPrismaService.card.create.mockResolvedValue(expectedResult);

      // Call the service method
      const result = await service.createCard(createCardDto);

      // Verify the results
      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.card.create).toHaveBeenCalledWith({
        data: {
          module_id: 1,
          front_text: 'Test Front',
          back_text: 'Test Back',
          image_url: 'test.jpg',
          tts_audio_url: 'test.mp3',
        },
      });
    });

    it('should handle errors when creating a card', async () => {
      // Prepare test data
      const createCardDto: CreateCardDto = {
        module_id: '1',
        front_text: 'Test Front',
        back_text: 'Test Back',
        image_url: 'test.jpg',
        tts_audio_url: 'test.mp3',
      };

      // Mock the create method to throw an error
      mockPrismaService.card.create.mockRejectedValue(
        new Error('Database error'),
      );

      // Verify that the error is handled
      await expect(service.createCard(createCardDto)).rejects.toThrow(
        'Failed to create card: Database error',
      );
    });
  });
});
