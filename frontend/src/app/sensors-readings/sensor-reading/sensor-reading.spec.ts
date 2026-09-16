import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SensorReading } from './sensor-reading';

describe('SensorReading', () => {
  let component: SensorReading;
  let fixture: ComponentFixture<SensorReading>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorReading],
    }).compileComponents();

    fixture = TestBed.createComponent(SensorReading);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
