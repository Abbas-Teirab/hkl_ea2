import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SensorsHistoryReadings } from './sensors-history-readings';

describe('SensorsHistoryReadings', () => {
  let component: SensorsHistoryReadings;
  let fixture: ComponentFixture<SensorsHistoryReadings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorsHistoryReadings],
    }).compileComponents();

    fixture = TestBed.createComponent(SensorsHistoryReadings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
