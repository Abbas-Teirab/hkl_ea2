import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataExport } from './data-export';

describe('DataExport', () => {
  let component: DataExport;
  let fixture: ComponentFixture<DataExport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataExport],
    }).compileComponents();

    fixture = TestBed.createComponent(DataExport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
